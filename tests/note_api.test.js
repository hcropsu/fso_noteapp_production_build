const { test, after, beforeEach, describe } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const helper = require('./test_helper')
const Note = require('../models/note')

const api = supertest(app)

describe('note_api', () => {
  console.log('entered describe')

  beforeEach(async () => {
    await Note.deleteMany({})
    console.log('DB cleared')

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

    console.log('DB initialized with initial data')
  })

  test('notes are returned as json', async () => {
    await api
      .get('/api/notes')
      .expect(200)
      .expect('Content-Type', /application\/json/)
  })

  test('there are two notes', async () => {
    const response = await api.get('/api/notes')
    assert.strictEqual(response.body.length, helper.initialNotes.length)
  })

  test('the first note is about HTTP methods', async () => {
    const response = await api.get('/api/notes')
    const contents = response.body.map(e => e.content)
    assert(contents.includes('HTML is easy'))
  })

  test('a valid note can be added', async () => {
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

  test('note without content is not added', async () => {
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

  test('a specific note can be viewed', async () => {
    const notesAtStart = await helper.notesInDb()
    const noteToView = notesAtStart[0]
    const resultNote = await api
      .get(`/api/notes/${noteToView.id}`)
      .expect(200)
      .expect('Content-Type', /application\/json/)

    assert.deepStrictEqual(resultNote.body, noteToView)
  })

  test('a note can be deleted', async () => {
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

after(async () => {
  await mongoose.connection.close()
})