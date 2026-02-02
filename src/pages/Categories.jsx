import { useState, useEffect } from 'react';
import db from '../db/database';

function Categories() {
  // State: list of categories
  const [categories, setCategories] = useState([]);
  // State: input field value
  const [newName, setNewName] = useState('');

  // Load categories when page opens
  useEffect(() => {
    loadCategories();
  }, []);

  // Function to load all categories from database
  const loadCategories = async () => {
    const allCategories = await db.categories.toArray();
    setCategories(allCategories);
  };

  // Function to add a new category
  const addCategory = async () => {
    if (newName.trim() === '') return; // Don't add empty names
    
    await db.categories.add({ name: newName });
    setNewName(''); // Clear input
    loadCategories(); // Reload list
  };

  // Function to delete a category
  const deleteCategory = async (id) => {
    await db.categories.delete(id);
    loadCategories(); // Reload list
  };

  return (
    <div>
      <h1>Categories</h1>
      
      {/* Form to add new category */}
      <div>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Category name"
        />
        <button onClick={addCategory}>Add</button>
      </div>

      {/* List of categories */}
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            {category.name}
            <button onClick={() => deleteCategory(category.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Categories;