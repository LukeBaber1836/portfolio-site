import * as React from 'react';
import Button from "@mui/material/Button";
import { Typography, AppBar, Toolbar } from '@mui/material';

function NavBar() {

  return (
    <AppBar color='secondary'>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Luke Baber
          </Typography>

          <Typography variant='h6' sx={{ mx: 3 }} >
            About
          </Typography>
          <Typography variant='h6' sx={{ mx: 3 }}>
            Experience
          </Typography>
          <Typography variant='h6' sx={{ mx: 3 }}>
            Projects
          </Typography>
        </Toolbar>
    </AppBar>
  )
}
export default NavBar
