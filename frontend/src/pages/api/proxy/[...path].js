// Next.js API route to proxy requests to backend
import axios from 'axios'

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8000'

export default async function handler(req, res) {
  const { path } = req.query
  const fullPath = Array.isArray(path) ? path.join('/') : path

  // Construct backend URL
  const backendUrl = `${BACKEND_URL}/api/v1/${fullPath}`

  // Add query params if any
  const queryString = new URLSearchParams(req.query).toString()
  const url = queryString ? `${backendUrl}?${queryString}` : backendUrl

  try {
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })

    res.status(response.status).json(response.data)
  } catch (error) {
    console.error('Proxy error:', error.message)

    if (error.response) {
      res.status(error.response.status).json(error.response.data)
    } else {
      res.status(500).json({ error: 'Backend unavailable' })
    }
  }
}