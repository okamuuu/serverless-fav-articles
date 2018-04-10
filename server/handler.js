const serverless = require('serverless-http');
const express = require('express');
const app = express();

const aws = require('aws-sdk');

const localDocClient = new aws.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
  endpoint: "http://localhost:8000"
});

const docClient = new aws.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
});

function getDocClientByIP(ip) {
  return ip === "127.0.0.1" ? localDocClient : docClient;
}

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS")
  next()
});

app.get('/api/articles', (req, res) => {

  const docClient = getDocClientByIP(req.ip);

  docClient.scan({
    TableName: 'articles',
    Limit: 100
  }).promise().then(result => {
    res.json({ articles: result.Items });
  });
});

app.get('/api/articles/:id', (req, res) => {

  const docClient = getDocClientByIP(req.ip);

  const getResult = docClient.get({
    TableName: 'articles',
    Key: {
      id: req.params.id,
    }
  }).promise().then(result => {
    res.json({ article: result.Item });
  })
});

app.put('/api/articles/:id/favorite', (req, res) => {

  const docClient = getDocClientByIP(req.ip);

  docClient.update({
    TableName: 'articles',
    Key: {
      id: req.params.id,
    },
    UpdateExpression: "set isFavorite = :val",
    ExpressionAttributeValues:{
      ":val": true
    },
    ReturnValues: "UPDATED_NEW"
  }).promise().then(result => {
    res.json(result);
  });
});

app.put('/api/articles/:id/unfavorite', (req, res) => {

  const docClient = getDocClientByIP(req.ip);

  docClient.update({
    TableName: 'articles',
    Key: {
      id: req.params.id,
    },
    UpdateExpression: "set isFavorite = :val",
    ExpressionAttributeValues:{
      ":val": false
    },
    ReturnValues: "UPDATED_NEW"
  }).promise().then(result => {
    res.json(result);
  });
});

module.exports.main = serverless(app);
