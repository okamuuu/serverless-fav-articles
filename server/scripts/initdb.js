const faker = require('faker');
const aws = require('aws-sdk');

const docClient = new aws.DynamoDB.DocumentClient({
  region: 'ap-northeast-1',
});

async function main() {

  const articles = [];

  for (var id = 1; id < 51; id++) {
    const result = await docClient.put({
      TableName: 'articles',
      Item: {
        "id": id + "",
        "title": faker.lorem.words(),
        "description": faker.lorem.paragraphs(),
        "isFavorite": false
      }
    }).promise();
  }
}

main();
