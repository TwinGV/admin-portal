import { Router, Request, Response } from 'express';
import { isAuthenticated, isInAllowedGroup } from '../auth/middleware';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { Button, ButtonsData } from '../types/index';

const router = Router();

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * Helper: Read buttons data from JSON file
 */
function readButtonsData(): ButtonsData {
  const dataFile = process.env.DATA_FILE || 'src/data.json';
  try {
    const data = fs.readFileSync(dataFile, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { buttons: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Helper: Write buttons data to JSON file
 */
function writeButtonsData(data: ButtonsData): void {
  const dataFile = process.env.DATA_FILE || 'src/data.json';
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * GET /api/buttons
 * Get all buttons (common for all + private for current user)
 */
router.get('/', isAuthenticated, (req: Request, res: Response) => {
  try {
    const data = readButtonsData();
    const username = req.session!.user.username;

    // Filter buttons: show all public + only user's private
    const visibleButtons = data.buttons.filter(btn =>
      !btn.isPrivate || btn.owner === username
    );

    res.json(visibleButtons);
  } catch (error) {
    console.error('Get buttons error:', error);
    res.status(500).json({ error: 'Failed to fetch buttons' });
  }
});

/**
 * POST /api/buttons
 * Create new button
 */
router.post('/', isAuthenticated, (req: Request, res: Response) => {
  try {
    const { title, url, icon, description, color, isPrivate } = req.body;

    if (!title || !url) {
      res.status(400).json({ error: 'Title and URL are required' });
      return;
    }

    const data = readButtonsData();
    const newButton: Button = {
      id: uuidv4(),
      title,
      url,
      icon: icon || 'fas fa-wrench',
      description,
      color,
      owner: req.session!.user.username,
      isPrivate: isPrivate || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.buttons.push(newButton);
    data.lastUpdated = new Date().toISOString();
    writeButtonsData(data);

    res.status(201).json(newButton);
  } catch (error) {
    console.error('Create button error:', error);
    res.status(500).json({ error: 'Failed to create button' });
  }
});

/**
 * PUT /api/buttons/:id
 * Update button (only owner or if public)
 */
router.put('/:id', isAuthenticated, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, url, icon, description, color, isPrivate } = req.body;
    const username = req.session!.user.username;

    const data = readButtonsData();
    const button = data.buttons.find(btn => btn.id === id);

    if (!button) {
      res.status(404).json({ error: 'Button not found' });
      return;
    }

    // Only owner can edit
    if (button.owner !== username) {
      res.status(403).json({ error: 'You can only edit your own buttons' });
      return;
    }

    // Update fields
    if (title) button.title = title;
    if (url) button.url = url;
    if (icon) button.icon = icon;
    if (description !== undefined) button.description = description;
    if (color !== undefined) button.color = color;
    if (isPrivate !== undefined) button.isPrivate = isPrivate;
    button.updatedAt = new Date().toISOString();

    data.lastUpdated = new Date().toISOString();
    writeButtonsData(data);

    res.json(button);
  } catch (error) {
    console.error('Update button error:', error);
    res.status(500).json({ error: 'Failed to update button' });
  }
});

/**
 * DELETE /api/buttons/:id
 * Delete button (only owner)
 */
router.delete('/:id', isAuthenticated, (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const username = req.session!.user.username;

    const data = readButtonsData();
    const buttonIndex = data.buttons.findIndex(btn => btn.id === id);

    if (buttonIndex === -1) {
      res.status(404).json({ error: 'Button not found' });
      return;
    }

    const button = data.buttons[buttonIndex];

    // Only owner can delete
    if (button.owner !== username) {
      res.status(403).json({ error: 'You can only delete your own buttons' });
      return;
    }

    // Delete custom icon if exists
    if (button.icon.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', button.icon);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    data.buttons.splice(buttonIndex, 1);
    data.lastUpdated = new Date().toISOString();
    writeButtonsData(data);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete button error:', error);
    res.status(500).json({ error: 'Failed to delete button' });
  }
});

/**
 * POST /api/buttons/:id/upload
 * Upload custom icon for button
 */
router.post('/:id/upload', isAuthenticated, upload.single('icon'), (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const username = req.session!.user.username;

    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const data = readButtonsData();
    const button = data.buttons.find(btn => btn.id === id);

    if (!button) {
      res.status(404).json({ error: 'Button not found' });
      return;
    }

    // Only owner can upload
    if (button.owner !== username) {
      res.status(403).json({ error: 'You can only update your own buttons' });
      return;
    }

    // Delete old custom icon if exists
    if (button.icon.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', button.icon);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    button.icon = `/uploads/${req.file.filename}`;
    button.updatedAt = new Date().toISOString();

    data.lastUpdated = new Date().toISOString();
    writeButtonsData(data);

    res.json({ success: true, icon: button.icon });
  } catch (error) {
    console.error('Upload icon error:', error);
    res.status(500).json({ error: 'Failed to upload icon' });
  }
});

export default router;
