import { Router, type NextFunction, type Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { authenticateSupabase, type AuthenticatedRequest } from '../middleware/auth.js'
import { supabaseAdmin } from '../supabase.js'
import { config } from '../config.js'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
})

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

router.get('/', authenticateSupabase, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { limit } = listQuerySchema.parse(req.query)

    const { data, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return res.status(500).json({ error: { code: 'DB_ERROR', message: error.message } })

    res.json({ files: data || [] })
  } catch (err) {
    next(err)
  }
})

router.post('/upload', authenticateSupabase, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Missing file' } })
    }

    const folder = (typeof req.body.folder === 'string' ? req.body.folder : '').trim()
    const safeFolder = folder ? folder.replace(/\\/g, '/').replace(/^\/+/, '') : ''

    const objectPath = `${req.userId}/${safeFolder ? safeFolder + '/' : ''}${Date.now()}_${req.file.originalname}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(config.storageBucket)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      })

    if (uploadError) {
      return res.status(400).json({ error: { code: 'UPLOAD_FAILED', message: uploadError.message } })
    }

    const { data: row, error: insertError } = await supabaseAdmin
      .from('files')
      .insert({
        user_id: req.userId,
        name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        storage_bucket: config.storageBucket,
        storage_path: objectPath,
      })
      .select('*')
      .single()

    if (insertError) {
      await supabaseAdmin.storage.from(config.storageBucket).remove([objectPath])
      return res.status(500).json({ error: { code: 'DB_ERROR', message: insertError.message } })
    }

    res.status(201).json({ file: row })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/download', authenticateSupabase, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id

    const { data: row, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single()

    if (error || !row) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } })
    }

    const { data, error: signError } = await supabaseAdmin.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, 60)

    if (signError || !data?.signedUrl) {
      return res.status(500).json({ error: { code: 'SIGNED_URL_FAILED', message: signError?.message || 'Failed to sign URL' } })
    }

    res.json({ url: data.signedUrl })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', authenticateSupabase, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id

    const { data: row, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single()

    if (error || !row) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File not found' } })
    }

    const { error: storageError } = await supabaseAdmin.storage.from(row.storage_bucket).remove([row.storage_path])
    if (storageError) {
      return res.status(400).json({ error: { code: 'DELETE_FAILED', message: storageError.message } })
    }

    const { error: deleteError } = await supabaseAdmin.from('files').delete().eq('id', id).eq('user_id', req.userId)
    if (deleteError) {
      return res.status(500).json({ error: { code: 'DB_ERROR', message: deleteError.message } })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
