require('dotenv').config()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const loginRouter = require('express').Router()
const User = require('../models/user')

loginRouter.post('/', async (request, response) => {
  const { username, password } = request.body

  const user = await User.findOne({ username: username })
  const passwordCorrect = user === null ? false : await bcrypt.compare(password, user.passwordHash)

  if (!(user && passwordCorrect)) {
    return response.status(401).json({ error: 'invalid username or password' })
  }

  const userForToken = {
    username: user.username,
    id: user._id
  }

  // Set the 'expiresIn' property to 60*60 seconds (1 h):
  // + added security
  // - less smooth UX

  // 'Server side session' could also be used: every token granted could be
  // saved to a DB, and for incoming reqs the validity of the token could be
  // checked.
  // + revoking a token could be done "instantly"
  // - added complexity to backend
  // - querying a DB for the information on token validity is slower than
  //   checking from the token itself (e.g. 'jwt.verify()' in 'notes.js')

  // When using server side sessions, the token is usually just a "random" string
  // not containing any information about the user (e.g. user id etc.). The user
  // info matching the token could be saved to a DB (a fast and specific such as Redis).
  // In server side sessions, the info on user id is also often transferred using
  // cookies instead of the 'Authorization' header.
  const token = jwt.sign(userForToken, process.env.SECRET, {  expiresIn: 60*60 })

  response
    .status(200)
    .send({ token, username: user.username, name: user.name })
})

module.exports = loginRouter