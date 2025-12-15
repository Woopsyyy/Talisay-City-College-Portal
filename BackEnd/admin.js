const express = require('express');
const db = require('../config/database');
const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
    if (req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin only.' });
    }
    next();
};

// Apply admin middleware to all routes
router.use(isAdmin);

// Get announcements
router.get('/announcements', async (req, res) => {
    try {
        const announcements = await db.query('SELECT * FROM announcements ORDER BY date DESC');
        res.json(announcements);
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create announcement
router.post('/announcements', async (req, res) => {
    try {
        const { title, content, year, department, major } = req.body;
        
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const sql = `INSERT INTO announcements (title, content, year, department, major) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`;
        const result = await db.query(sql, [title, content, year || null, department || null, major || null]);

        const insertId = result.insertId || result.id;

        // Log to audit
        await db.query(
            'INSERT INTO audit_log (admin_user, action, target_table, target_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.session.username, 'create', 'announcements', insertId, `created announcement id=${insertId}`]
        );

        res.status(201).json({ success: true, id: insertId });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete announcement
router.delete('/announcements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM announcements WHERE id = $1', [id]);

        // Log to audit
        await db.query(
            'INSERT INTO audit_log (admin_user, action, target_table, target_id, details) VALUES ($1, $2, $3, $4, $5)',
            [req.session.username, 'delete', 'announcements', id, `deleted announcement id=${id}`]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get users
router.get('/users', async (req, res) => {
    try {
        const users = await db.query('SELECT id, username, full_name, school_id, role, image_path, created_at FROM users ORDER BY created_at DESC');
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get sections
router.get('/sections', async (req, res) => {
    try {
        const sections = await db.query('SELECT * FROM sections ORDER BY year, name');
        res.json(sections);
    } catch (error) {
        console.error('Get sections error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get subjects
router.get('/subjects', async (req, res) => {
    try {
        const subjects = await db.query('SELECT * FROM subjects ORDER BY course, major, year_level, subject_code');
        res.json(subjects);
    } catch (error) {
        console.error('Get subjects error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;

