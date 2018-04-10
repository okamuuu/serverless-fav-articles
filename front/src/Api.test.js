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
