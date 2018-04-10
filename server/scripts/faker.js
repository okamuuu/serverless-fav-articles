const faker = require('faker');

function getMockArticles() {

  const articles = [];

  for (var id = 1; id < 51; id++) {
    articles.push({
      "id": id + "",
      "title": faker.lorem.words(),
      "description": faker.lorem.paragraphs(),
      "isFavorite": id % 10 === 0 ? true : false
    })
  }

  return articles;
}

console.log(JSON.stringify(getMockArticles()));
