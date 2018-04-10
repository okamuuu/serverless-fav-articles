const _ = require('lodash');
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
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS")
  next()
});

function convertIdToNumber(article) {
  article.id = parseInt(article.id, 10);
  return article;
}

app.get('/api/articles', (req, res) => {

  const { favorite } = req.query;

  const docClient = getDocClientByIP(req.ip);

  docClient.scan({
    TableName: 'articles',
  }).promise().then(result => {
    let articles = result.Items;
    articles = articles.map(convertIdToNumber);
    articles = _.orderBy(articles, ['id'], ['asc']);
    if (favorite) {
      articles = articles.filter(x => x.isFavorite);
    }
    res.json({ articles });
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
    let article = result.Item;
    article = convertIdToNumber(article);
    res.json({ article });
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
    ReturnValues: "ALL_NEW"
  }).promise().then(result => {
    res.json(convertIdToNumber(result.Attributes));
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
    ReturnValues: "ALL_NEW"
  }).promise().then(result => {
    res.json(convertIdToNumber(result.Attributes));
  });
});

module.exports.main = serverless(app);

