import * as React from 'react';
import Button from '@mui/joy/Button';
import Card from '@mui/joy/Card';

// Components
import NavBar from './components/Partials/Navbar';
import Homehero from './components/HomeHero';


const App = () => {

  return (
    <>
    <NavBar/>
    <h1>This is my Website</h1>
    <Homehero/>
    </>
  );
}

export default App;
