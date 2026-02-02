import db from './db/database';

function App() {
  
  const testDatabase = async () => {
    // Add a test category
    const id = await db.categories.add({ 
      name: 'Test category' 
    });
    console.log('Category created with id:', id);
    
    // Read all categories
    const allCategories = await db.categories.toArray();
    console.log('All categories:', allCategories);
  };

  return (
    <div>
      <h1>Whizzfin</h1>
      <button onClick={testDatabase}>
        Test database
      </button>
      <p>Open the browser console (F12) to see the results</p>
    </div>
  );
}

export default App;