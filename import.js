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

function indexFaces() {
  var paths = klawSync("./facesCollection", { nodir: true });
  paths.forEach(file => {
    console.log(file.path);
    var p = path.parse(file.path);
    var name = p.name.replace(/\W/g, "");
    var bitmap = fs.readFileSync(file.path);
    rekognition.indexFaces({
      CollectionId: config.collectionName,
      DetectionAttributes: ["ALL"],
      ExternalImageId: name,
      Image: {
        Bytes: bitmap
      }
    });
  });
}

createCollection();
indexFaces();
