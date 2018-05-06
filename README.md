
## FastCheck: Detect faces in video by AWS Rekognition

An implementation of automated class attendance checking system, backed up by AWS's Rekognition service.

## Requirements

The only requirement of this application is the Node Package Manager. All other
dependencies can be installed with:

    npm install

## Basic Configuration

You need to set up your AWS security credentials before the sample code is able
to connect to AWS. You can do this by creating a file named "credentials" at ~/.aws/ 
(C:\Users\USER_NAME\.aws\ for Windows users) and saving the following lines in the file:

    [default]
    aws_access_key_id = <your access key id>
    aws_secret_access_key = <your secret key>

Create IAM user with these user permission

    - AmazonSNSFullAccess
	- AmazonSQSFullAccess
	- AmazonS3FullAccess
	- AmazonRekognitionFullAccess
	- AmazonRekognitionServiceRole
	- AmazonPollyFullAccess

Then config your IAM, SNS, SQS  via these tutorials [link](https://docs.aws.amazon.com/rekognition/latest/dg/video-analyzing-with-sqs.html) , [link](https://docs.aws.amazon.com/rekognition/latest/dg/api-video-roles.html)

Create the `config.js` file with your settings base on `config_template.js`

## Running the project

You'll need to have some images in `facesCollection`. Run this to import them to AWS collection:

    node import.js

Then to start after:

    node index.js

Next, you go to http://localhost:5555/ in your browser you'll see a simple form for uploading an video.

After video is uploaded, you will see the status of the analysis progress.

You should refresh the browser until you get `SUCCEEDED` status.

Finally, you should see the analysis result and get `speech.mp3` file on project's root folder.
