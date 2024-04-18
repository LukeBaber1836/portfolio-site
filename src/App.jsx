import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';


const App = () => {

  return (
    <div>
      <AppBar>
        <Toolbar>
          <Typography variant="h6">
            Luke Baber
          </Typography>
          <Typography variant="h6">
            Experience
          </Typography>
          <Typography variant="h6">
            Projects
          </Typography>
          <Typography variant="h6">
            About
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Container>
        {/* Your content here */}
        <Typography variant="h4" gutterBottom>
          Welcome to my website!
        </Typography>
        <Typography variant="body1">
          Here you can find information about my experiences, projects, and more.
        </Typography>
      </Container>
    </div>
  );
}

export default App;
