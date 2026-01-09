import { Router, Request, Response } from "express";
import db from "../db";
import { Item } from "../types/item";

const router = Router();

// Create a resource
router.post("/", (req: Request, res: Response) => {
  try {
    const { name, description }: Item = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = db
      .prepare("INSERT INTO items (name, description) VALUES (?, ?)")
      .run(name, description || null);

    res.status(201).json({
      id: result.lastInsertRowid,
      message: "Item created successfully",
    });
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// List resources with basic filters
router.get("/", (req: Request, res: Response) => {
  try {
    const { name, description } = req.query;

    let query = "SELECT * FROM items WHERE 1=1";
    const params: any[] = [];

    if (name) {
      query += " AND name LIKE ?";
      params.push(`%${name}%`);
    }

    if (description) {
      query += " AND description LIKE ?";
      params.push(`%${description}%`);
    }

    const items = db.prepare(query).all(...params);

    res.json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Error fetching items:", error);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Get details of a resource
router.get("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const item = db.prepare("SELECT * FROM items WHERE id = ?").get(id);

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

// Update resource details
router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description }: Item = req.body;

    // Validate ID
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    const result = db
      .prepare("UPDATE items SET name = ?, description = ? WHERE id = ?")
      .run(name, description || null, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item updated successfully" });
  } catch (error) {
    console.error("Error updating item:", error);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// Delete a resource
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = db.prepare("DELETE FROM items WHERE id = ?").run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;
