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
        <h2>Articles</h2>
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
