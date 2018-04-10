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
