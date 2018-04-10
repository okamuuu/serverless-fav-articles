import React from 'react'
import { BrowserRouter as Router, Switch, Route, Link, NavLink, withRouter } from 'react-router-dom'

import Articles from './Articles'

const Header = ({onClick}) => (
  <h1 className="text-center" style={{cursor: "pointer" }} onClick={onClick}>Favorite Articles</h1>
)

const Nav = () => (
  <nav className="nav nav-pills">
    <NavLink className="nav-link" exact to="/articles">Articles</NavLink>
    <NavLink className="nav-link" exact to="/articles/favorite">Favorite Articles</NavLink>
  </nav>
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
