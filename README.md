# README

## create skelton

```
mkdir serverless-fav-articles && cd $_
create-react-app front
sls create --template aws-nodejs --path server && cd $_
yarn init -y
yarn add aws-sdk express serverless-http --save
yarn add serverless-offline serverless-dynamodb-local serverless-finch faker --dev
mkdir scripts migrations
touch scripts/faker.js
touch migrations/articles.json
```

## Serverless

move to `server` directory

```
cd ./server
```

### create mock object

create `scripts/faker.js`

```
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
```

run it

```
node scripts/faker.js > ./migrations/articles.json
```

## setup DynamoDB on local machine

edit serverless.yml

```
service: serverless-fav-articles
plugins:
   - serverless-finch
   - serverless-dynamodb-local
   - serverless-offline

custom:
  client:
    bucketName: [your-backet-name]
    distributionFolder: ../front/build
  dynamodb:
    start:
      port: 8000
      inMemory: true
      migrate: true
      seed: true
    seed:
      development:
        sources:
          - table: articles
            sources: [./migrations/articles.json]

provider:
  name: aws
  runtime: nodejs6.10
  stage: dev
  region: ap-northeast-1

resources:
  Resources:
    ArticlesTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: articles
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
        ProvisionedThroughput:
          ReadCapacityUnits: 1
          WriteCapacityUnits: 1
```

install dynamodb

```
sls dynamodb install
```

run it

```
sls dynamodb start
```

check it

```
aws dynamodb scan --table-name articles --endpoint-url http://localhost:8000 | jq .Count
50
```

### local API Gateway

edit `serverless.yml`

```
@@ -36,3 +37,16 @@ resources:
         ProvisionedThroughput:
           ReadCapacityUnits: 1
           WriteCapacityUnits: 1
+
+functions:
+  app:
+    handler: handler.main
+    events:
+      - http:
+          method: ANY
+          path: '/'
+          cors: true
+      - http:
+          method: ANY
+          path: '{proxy+}'
+          cors: true
```

edit `handler.js`

```
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
```

run local API Gateway

```
serverless offline --port 4000
```

check it

```
BASE_URL="http://localhost:4000"
curl -s -X GET "${BASE_URL}/api/articles"
curl -s -X GET "${BASE_URL}/api/articles/1" | jq .
curl -s -X PUT "${BASE_URL}/api/articles/1/favorite"
curl -s -X GET "${BASE_URL}/api/articles/1" | jq .article.isFavorite
curl -s -X PUT "${BASE_URL}/api/articles/1/unfavorite"
curl -s -X GET "${BASE_URL}/api/articles/1" | jq .article.isFavorite
```

## React App

### Create Api component

```
cd ../front
yarn add axios --save
touch src/Api.js
```

create `src/Api.js`

```
import axios from 'axios'

export default class Api {

  constructor(baseUrl) {
    this.baseUrl = baseUrl
  }

  listArticles() {
    return axios.get(`${this.baseUrl}/api/articles`).then((res) => {
      return {
        "articles": res.data.articles || []
      }
    })
  }

  listFavoriteArticles() {
    return axios.get(`${this.baseUrl}/api/articles?favorite=1`).then((res) => {
      return {
        "articles": res.data.articles || []
      }
    })
  }

  showArticle(id) {
    return axios.get(`${this.baseUrl}/api/articles/${id}`).then((res) => {
      return { "article": res.data.article }
   })
  }

  updateArticleFavorite(id) {
    return axios.put(`${this.baseUrl}/api/articles/${id}/favorite`).then((res) => {
      return { "article": res.data }
    })
  }

  updateArticleUnFavorite(id) {
    return axios.put(`${this.baseUrl}/api/articles/${id}/unfavorite`).then((res) => {
      return { "article": res.data }
    })
  }

}
```

create test case

```
import Api from '../src/Api'

const port = 4000;
const api = new Api(`http://127.0.0.1:${port}`)

describe('Api', function() {

  test('listArticles', async () => {
    const result = await api.listArticles()
    expect(result.articles.length).toEqual(50)
  })

  test('listFavoriteArticles', async () => {
    const result = await api.listFavoriteArticles()
    expect(result.articles.length).toEqual(5)
  })

  test('showFavoriteArticle', async () => {
    const result = await api.showArticle(1)
    expect(result.article.id).toEqual(1)
    expect(result.article.isFavorite).toEqual(false)
  })

  test('updateArticle Favorite and UnFavorite', async () => {
    const result1 = await api.updateArticleFavorite(2);
    expect(result1.article.isFavorite).toEqual(true)
    const result2 = await api.updateArticleUnFavorite(2);
    expect(result2.article.isFavorite).toEqual(false)
  })

})
```

run test cases

```
CI=true yarn test
```

### A few Designing

```
yarn add bootstrap --save
```

edit `src/index.js`

```
 import ReactDOM from 'react-dom';
 +import 'bootstrap/dist/css/bootstrap.css';
 import './index.css';
 import App from './App';
 import registerServiceWorker from './registerServiceWorker';
 
 ReactDOM.render(<App />, document.getElementById('root'));
```

### react-router

```
yarn add react-router-dom --save
touch src/Articles.js
```

create `src/Articles.js`

```
import React, {Component} from 'react'
import { Link } from 'react-router-dom'

class List extends Component {

  render() {
    return (
      <div>
        <h2>Articles</h2>
        <ul>
          <li><Link to="/articles/1">Show 1</Link></li>
          <li><Link to="/articles/2">Show 2</Link></li>
          <li><Link to="/articles/3">Show 3</Link></li>
        </ul>
      </div>
    )
  }
}

class FavoriteList extends Component {

  render() {
    return (
      <div>
        <h2>Favorite Articles</h2>
      </div>
    )
  }
}

class Show extends Component {

  render() {
    return (
      <div>
        <h3>Show {this.props.match.params.id}</h3>
      </div>
    )
  }
}

export default { List, FavoriteList, Show }
```

edit `src/App.js`

```
import React from 'react'
import { BrowserRouter as Router, Switch, Route, Link, NavLink, withRouter } from 'react-router-dom'

import Articles from './Articles'

const Header = ({onClick}) => (
  <h1 className="text-center" style={{cursor: "pointer" }} onClick={onClick}>Favorite Articles</h1>
)

const Nav = () => (
  <ul className="nav nav-pills">
    <li><NavLink exact to="/articles">Articles</NavLink></li>
    <li><NavLink exact to="/articles/favorite">Favorite Articles</NavLink></li>
  </ul>
)

const Footer = () => (<p className="text-center">Favorite Articles</p>)

const Routes = withRouter(({history}) => (
  <div className="container">
    <Header onClick={() => history.push("/")} />
    <Nav />
    <Switch>
      <Route exact path="/" component={Articles.List}/>
      <Route exact path="/articles" component={Articles.List}/>
      <Route exact path="/articles/favorite" component={Articles.FavoriteList}/>
      <Route exact path="/articles/:id" component={Articles.Show}/>
    </Switch>
    <Footer />
  </div>
))

const App = () => (
  <Router>
    <Routes />
  </Router>
)

export default App
```

### Using Api Class

add proxy setting. add follow lines to `package.json`. and restart  `yarn start` react development server

```
  "proxy": {
    "/api": {
      "target": "http://localhost:4000"
    }   
  }
```

edit `src/Articles.js`

```
import React, {Component} from 'react'
import { Link } from 'react-router-dom'

import Api from './Api'

const BASE_URL = process.env.REACT_APP_GW_URL ? process.env.REACT_APP_GW_URL : '';

const api = new Api(BASE_URL);

class List extends Component {

  constructor(props) {
    super(props)
    this.state = { articles: [] }
  }

  componentWillMount() {
    api.listArticles().then((result) => {
      this.setState({articles: result.articles});
    })
  }

  render() {
    return (
      <div>
        <h2>Articles</h2>
        <ul>
          {this.state.articles.map((x, index) => (
            <li key={index}>
              <Link to={`/articles/${x.id}`}>{x.title}</Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}

class FavoriteList extends Component {

  constructor(props) {
    super(props)
    this.state = { articles: [] }
  }

  componentWillMount() {
    api.listFavoriteArticles().then((result) => {
      this.setState({articles: result.articles});
    })
  }

  render() {
    return (
      <div>
        <h2>Favorite Articles</h2>
        <ul>
          {this.state.articles.map((x, index) => (
            <li key={index}>
              <Link to={`/articles/${x.id}`}>{x.title}</Link>
            </li>
          ))}
        </ul>

      </div>
    )
  }
}

class Show extends Component {

  constructor(props) {
    super(props)
    this.state = { article: {} }
  }

  componentWillMount() {
    const { id } = this.props.match.params
    api.showArticle(parseInt(id, 10)).then((result) => {
      this.setState({article: result.article})
    })
  }

  render() {
    const {article} = this.state
    return (
      <div>
        <h2>{article.title}</h2>
        <p>{article.description}</p>
      </div>
    )
  }
}

export default { List, FavoriteList, Show }
```

### Add Favorite Toggle Button

```
yarn add react-icons --save
```

edit `src/Articles.js`

```
import React, {Component} from 'react'
import { Link } from 'react-router-dom'

import FaStar from 'react-icons/lib/fa/star'

import Api from './Api'

const BASE_URL = process.env.REACT_APP_GW_URL ? process.env.REACT_APP_GW_URL : '';

const api = new Api(BASE_URL);

const FavoriteButton = ({isFavorite, onClick}) => (
    <FaStar style={{cursor: "pointer"}} color={isFavorite ? "#ffa500" : "#eee"} onClick={onClick} />)

class List extends Component {

  constructor(props) {
    super(props)
    this.state = { articles: [] }
  }

  componentWillMount() {
    api.listArticles().then((result) => {
      this.setState({articles: result.articles});
    })
  }

  async handleFavorite(article, index) {
    let updated = {};

    if (article.isFavorite) {
      updated = await api.updateArticleUnFavorite(article.id);
    } else {
      updated = await api.updateArticleFavorite(article.id);
    }
    const nextArticles = Object.assign([], this.state.articles);
    nextArticles[index] = updated.article;
    this.setState({articles: nextArticles})
  }

  render() {
    return (
      <div>
        <h2 style={{padding:"30px"}}>Articles</h2>
        <ul>
          {this.state.articles.map((x, index) => (
            <li key={index}>
              <Link to={`/articles/${x.id}`}>{x.title}</Link>
              {" "}
              <FavoriteButton isFavorite={x.isFavorite} onClick={() => this.handleFavorite(x, index)} />
            </li>
          ))}
        </ul>
      </div>
    )
  }
}

class FavoriteList extends Component {

  constructor(props) {
    super(props)
    this.state = { articles: [] }
  }

  componentWillMount() {
    api.listFavoriteArticles().then((result) => {
      this.setState({articles: result.articles});
    })
  }

  render() {
    return (
      <div>
        <h2 style={{padding:"30px"}}>Favorite Articles</h2>
        <ul>
          {this.state.articles.map((x, index) => (
            <li key={index}>
              <Link to={`/articles/${x.id}`}>{x.title}</Link>
            </li>
          ))}
        </ul>

      </div>
    )
  }
}

class Show extends Component {

  constructor(props) {
    super(props)
    this.state = { article: {} }
  }

  componentWillMount() {
    const { id } = this.props.match.params
    api.showArticle(parseInt(id, 10)).then((result) => {
      this.setState({article: result.article})
    })
  }

  render() {
    const {article} = this.state
    return (
      <div>
        <h2>{article.title}</h2>
        <p>{article.description}</p>
      </div>
    )
  }
}

export default { List, FavoriteList, Show }
```

## Deploy

### 

At first, create S3 Bucket. after that you can deploy using the following commands.

```
cd ../server
sls deploy
```

set REACT_APP_GW_URL

```
# export REACT_APP_GW_URL="https://ionsbmen8j.execute-api.ap-northeast-1.amazonaws.com/dev"
# export REACT_APP_GW_URL="https://[your-api-gateway-url].execute-api.ap-northeast-1.amazonaws.com/dev"
cd ../front
yarn build
cd ../server
serverless client deploy
```

### init db && IAM

create `scripts/initdb.js`

```
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
```

run it

```
node scripts/initdb.js
```

edit `serverless.yml`

```
provider:
  name: aws 
  runtime: nodejs6.10
  stage: dev 
  region: ap-northeast-1
  environment:
    # DYNAMODB_TABLE: ${self:service}-${opt:stage, self:provider.stage}
    DYNAMODB_TABLE: articles
  iamRoleStatements:
    - Effect: Allow
      Action:
        - dynamodb:Query
        - dynamodb:Scan
        - dynamodb:GetItem
        - dynamodb:PutItem
        - dynamodb:UpdateItem
        - dynamodb:DeleteItem
      Resource: "arn:aws:dynamodb:${opt:region, self:provider.region}:*:table/${self:provider.environment.DYNAMODB_TABLE}"
```

deploy again. you can see aticles. enjoy:)

