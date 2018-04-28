const config = require("./config");
const AWS = require("aws-sdk");
AWS.config.region = config.region;
const fs = require("fs-extra");
const path = require("path");
const klawSync = require("klaw-sync");
const rekognition = new AWS.Rekognition({ region: config.region });

function createCollection() {
  rekognition.createCollection(
    { CollectionId: config.collectionName },
    function(err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    }
  );
}

function done(err,data,next) {
  
}

function uploadImg(done,file) {
  
}

function indexFaces() {
  var paths = klawSync("facesCollection", { nodir: true });

  paths.reduce((next,file) => (()=>{
    var p = path.parse(file.path);
    var name = p.name.replace(/\W/g, "");
    var bitmap = fs.readFileSync(file.path);
    rekognition.indexFaces({
    CollectionId: config.collectionName,
    DetectionAttributes: ["ALL"],
    ExternalImageId: name,
    Image: {
      Bytes: bitmap
    }},  function(err, data) {
      if (err) {
        console.log("BBBB") 
        console.log(err, err.stack); // an error occurred
      } else {
        console.log(data)
        console.log("AAAA")           // successful response
        // fs.writeJson(file.path + ".json", data, err => {
        //   if (err) return console.error(err)
        // });
        if (next) next();
        }
      }
    );
  }
),null)();

  // paths.forEach(file => {
  //   console.log(file.path);
  //   var p = path.parse(file.path);
  //   var name = p.name.replace(/\W/g, "");
  //   var bitmap = fs.readFileSync(file.path);
  //   console.log(bitmap)
  //   rekognition.indexFaces({
  //     CollectionId: config.collectionName,
  //     DetectionAttributes: ["ALL"],
  //     ExternalImageId: name,
  //     Image: {
  //       Bytes: bitmap
  //     }},  function(err, data) {
  //       if (err) {
  //         console.log("BBBB") 
  //         console.log(err, err.stack); // an error occurred
  //       } else {
  //         console.log(data)
  //         console.log("AAAA")           // successful response
  //         fs.writeJson(file.path + ".json", data, err => {
  //           if (err) return console.error(err)
  //         });
  //       }
  //     }
  //   );
  //   console.log("succeed")
  // });
  
}

createCollection();
indexFaces();
