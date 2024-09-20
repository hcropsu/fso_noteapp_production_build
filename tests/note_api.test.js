const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const Note = require('../models/note')

const api = supertest(app)

describe('when there are initial notes in the DB', () => {

  beforeEach(async () => {
    await Note.deleteMany({})

    // Using 'Promise.all()', which gets an array of promises
    // (as result of using 'save()'). Then 'await' waits for
    // all of the promises to reach 'fulfilled' until moving on.
    // As a potential downside all promises are run parallel,
    // so if order matters, better to use 'for...of'.
    /*
    const noteObjects = helper.initialNotes
      .map(note => new Note(note))
    const promiseArray = noteObjects.map(note => note.save())
    await Promise.all(promiseArray)
    */

    // Using 'for..of'
    /*
    for (let note of helper.initialNotes) {
      let noteObject = new Note(note)
      await noteObject.save()
    }
    */

    // Easiest solution is to use a Mongoose method
    // 'insertMany()'
    await Note.insertMany(helper.initialNotes)
  })

  test('notes are returned as json', async () => {
    await api
      .get('/api/notes')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('all notes are returned', async () => {
    const response = await api.get('/api/notes')
    assert.strictEqual(response.body.length, helper.initialNotes.length)
  })

  test('a specific note is among the returned notes', async () => {
    const response = await api.get('/api/notes')
    const contents = response.body.map(n => n.content)
    assert(contents.includes('HTML is easy'))
  })

  describe('viewing a specific note', () => {

    test('succeeds with a valid "id"', async () => {
      const notesAtStart = await helper.notesInDb()
      const noteToView = notesAtStart[0]
      const resultNote = await api
        .get(`/api/notes/${noteToView.id}`)
        .expect(200)
        .expect('Content-Type', /application\/json/)

      assert.deepStrictEqual(resultNote.body, noteToView)
    })

    test('fails with HTTP 404 if note does not exist', async () => {
      const validNonExistingId = await helper.nonExistingId()

      await api
        .get(`/api/notes/${validNonExistingId}`)
        .expect(404)
    })

    test('fails with HTTP 400 if id is invalid', async() => {
      const invalidId = '5a3d5da59070081a82a3445'

      await api
        .get(`/api/notes/${invalidId}`)
        .expect(400)
    })
  })

  describe('adding a new note', () => {

    test('succeeds with valid data', async () => {
      const newNote = {
        content: 'async/await simplifies making async calls',
        important: true,
      }

      await api
        .post('/api/notes')
        .send(newNote)
        .expect(201)
        .expect('Content-Type', /application\/json/)

      const response = await api.get('/api/notes')
      const contents = response.body.map(r => r.content)

      assert.strictEqual(response.body.length, helper.initialNotes.length + 1)
      assert(contents.includes('async/await simplifies making async calls'))
    })

    test('fails with HTTP 400 if data is invalid', async () => {
      const newNote = {
        important: true
      }

      await api
        .post('/api/notes')
        .send(newNote)
        .expect(400)

      const response = await api.get('/api/notes')

      assert.strictEqual(response.body.length, helper.initialNotes.length)
    })
  })

  describe('deletion of a note', () => {

    test('succeeds with HTTP 204 if id is valid', async () => {
      const notesAtStart = await helper.notesInDb()
      const noteToDelete = notesAtStart[0]

      await api
        .delete(`/api/notes/${noteToDelete.id}`)
        .expect(204)

      const notesAtEnd = await helper.notesInDb()
      const contents = notesAtEnd.map(r => r.content)

      assert(!contents.includes(noteToDelete.content))

      assert.strictEqual(notesAtEnd.length, notesAtStart.length - 1)
    })
  })
})

after(async () => {
  await mongoose.connection.close()
})