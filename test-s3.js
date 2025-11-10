// Test your S3 configuration
// Run: node test-s3.js

const { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function testS3Connection() {
  try {
    console.log('Testing S3 connection...');
    
    // Test 1: List buckets (to verify credentials)
    const listCommand = new ListBucketsCommand({});
    const buckets = await s3Client.send(listCommand);
    console.log('✓ Successfully connected to S3');
    console.log('Available buckets:', buckets.Buckets?.map(b => b.Name));
    
    // Test 2: Upload test file
    const testData = { message: 'Hello from your budget app!', timestamp: new Date().toISOString() };
    const putCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'test/connection-test.json',
      Body: JSON.stringify(testData),
      ContentType: 'application/json',
    });
    
    await s3Client.send(putCommand);
    console.log('✓ Successfully uploaded test file');
    
    // Test 3: Download test file
    const getCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: 'test/connection-test.json',
    });
    
    const result = await s3Client.send(getCommand);
    const downloadedData = await result.Body.transformToString();
    console.log('✓ Successfully downloaded test file');
    console.log('Downloaded data:', JSON.parse(downloadedData));
    
    console.log('🎉 S3 setup is working correctly!');
    
  } catch (error) {
    console.error('❌ S3 test failed:', error.message);
    
    if (error.name === 'CredentialsProviderError') {
      console.log('Check your AWS credentials in .env.local');
    } else if (error.name === 'NoSuchBucket') {
      console.log('Check your S3_BUCKET_NAME in .env.local');
    } else if (error.name === 'AccessDenied') {
      console.log('Check your IAM permissions');
    }
  }
}

testS3Connection();