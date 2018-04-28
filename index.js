// Load the SDK
const config = require("./config.js");
const AWS = require("aws-sdk");
AWS.config.region = config.region;
const express = require("express");
const app = express();
const cors = require("cors");
app.use(express.static("public"));
app.use(cors());
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const fs = require("fs-extra");
const path = require("path");
const klawSync = require("klaw-sync");
const rekognition = new AWS.Rekognition({ region: config.region });
const sqs = new AWS.SQS();
const s3 = new AWS.S3();
const Polly = new AWS.Polly({
  signatureVersion: "v4",
  region: config.region
});
const Stream = require("stream");
const port = process.env.PORT || 5555;
const d = new Date();
const n = d.getTime();

// const cors = require("cors");
// app.use(cors());

function uploadVideo(uploadfile, filename) {
  return s3
    .upload({
      Bucket: config.bucket,
      Body: uploadfile,
      Key: config.keyPath + n + "_" + filename
    })
    .promise();
}

function startSearch(uploadresult) {
  return rekognition
    .startFaceSearch({
      CollectionId: config.collectionName,
      Video: {
        S3Object: {
          Bucket: config.bucket,
          Name: uploadresult.Key
        }
      },
      ClientRequestToken: "FaceMatchToken_" + n,
      NotificationChannel: {
        SNSTopicArn: config.SNSArn,
        RoleArn: config.roleArn
      },
      JobTag: "MatchingFaces_" + n
    })
    .promise();
}

function getResult(id) {
  return new Promise(resolve => {
    console.log("Sending Request");
    sqs.receiveMessage(
      {
        AttributeNames: ["SentTimestamp"],
        MaxNumberOfMessages: 1,
        MessageAttributeNames: ["All"],
        QueueUrl: config.queueURL,
        WaitTimeSeconds: 0
      },
      function(err, sqsResult) {
        if (err) {
          resolve(err);
        } else {
          console.log("Loading Results");
          rekognition.getFaceSearch(
            {
              JobId: id
            },
            function(err, data) {
              if (err) {
                resolve(err);
              } else {
                console.log("Result Recieved");
                resolve(data);
              }
            }
          );
        }
      }
    );
  });
}

function getUniquePersons(dataset) {
  var seen = new Set();
  var uniquePersons = [];
  for (var i = 0; i < dataset.Persons.length; i++) {
    console.log(dataset.Persons[i])
    if (dataset.Persons[i].hasOwnProperty("FaceMatches")) {
      if (dataset.Persons[i].FaceMatches.length > 0) {
        console.log(dataset.Persons[i].FaceMatches[0].Face.ExternalImageId)
        if (seen.has(dataset.Persons[i].FaceMatches[0].Face.ExternalImageId))
          continue;
        seen.add(dataset.Persons[i].FaceMatches[0].Face.ExternalImageId);
        uniquePersons.push(
          dataset.Persons[i].FaceMatches[0].Face.ExternalImageId
        );
      }
    }
  }
  return uniquePersons;
}

async function uploading(uploadfile, originalname, res) {
  const uploadresult = await uploadVideo(uploadfile, originalname);
  const id = await startSearch(uploadresult);
  //res.redirect("/result/" + id.JobId);
  res.send("/result/" + id.JobId)
}

async function calling(id, next) {
  try {
    const dataset = await getResult(id);
    if (dataset.JobStatus === "SUCCEEDED") {
      const person = getUniquePersons(dataset);
      next({ Status: "SUCCEEDED", Results: person });
    } else if (dataset.JobStatus === "IN_PROGRESS") {
      next({ Status: "IN_PROGRESS" });
    } else {
      next({ Status: "FAILED" });
    }
  } catch (err) {
    next({ Status: "FAILED" });
  }
}

function generateLine(studentList) {
  var line = "";
  for (var key in studentList) {
    line += key + " is " + studentList[key] + ",";
  }
  return line;
}

function generateVoice(data, res) {
  console.log("Generating Voice");
  if (data.Status === "SUCCEEDED") {
    var voiceLine =
      "Here is a list of students who attend class," +
      generateLine(data.StatusList);
    Polly.synthesizeSpeech(
      {
        Text: voiceLine,
        OutputFormat: "mp3",
        VoiceId: "Amy"
      },
      function(err, data) {
        if (err) {
          console.log(err.code);
        } else if (data) {
          
          if (data.AudioStream instanceof Buffer) {
            fs.writeFile("./speech.mp3", data.AudioStream, function(err) {
              if (err) {
                return console.log(err);
              } else {
                console.log("Sending Voice");
                var speechFile = fs.createReadStream("./speech.mp3");
                return speechFile.pipe(res);
              }
            });
          }
        }
      }
    );
  } else return res.send(data.Status);
}

function getStudentList() {
  var paths = klawSync("./facesCollection", { nodir: true });
  var studentList = {};
  paths.forEach(file => {
    var p = path.parse(file.path);
    var name = p.name.replace(/\W/g, "");
    studentList[name] = "absent";
  });
  return studentList;
}

async function checkStudentStatus(data, next) {
  if (data.Status === "SUCCEEDED") {
    console.log("Matching Faces");
    var studentList = await getStudentList();
    for (var i = 0; i < data.Results.length; i++) {
      studentList[data.Results[i]] = "present";
    }
    next({ Status: data.Status, StatusList: studentList });
  } else next({ Status: data.Status });
}

app.post("/upload", upload.single("video"), function(req, res, next) {
  var uploadfile = fs.readFileSync(req.file.path);
  uploading(uploadfile, req.file.originalname, res);
});

app.get("/result/:id", function(req, res, next) {
  calling(req.param("id"), function(data, next) {
    console.log(data)
    checkStudentStatus(data, function(lst) {
      generateVoice(lst, res);
    });
  });
});

app.listen(port, function() {
  rekognition.createCollection({CollectionId: config.collectionName});
  console.log(`Listening on port ${port}`);
});
