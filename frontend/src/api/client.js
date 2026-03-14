import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const sendMessage = (message, session_id) =>
  api.post('/chat', { message, session_id })

export const ingestFile = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api.post('/ingest/file', form)
}

export const ingestURL = (url) =>
  api.post('/ingest/url', { url })

export const getSources = () =>
  api.get('/sources')

export const deleteSource = (name) =>
  api.delete(`/sources/${encodeURIComponent(name)}`)

export const getHealth = () =>
  api.get('/health')