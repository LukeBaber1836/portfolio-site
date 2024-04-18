import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from "@mui/material/Toolbar";
import Button from "@mui/material/Button";

function NavBar() {

  return (
    <>
    <div>
        <AppBar position="sticky" color='secondary'>
            <Toolbar>
            <Button color="inherit">Login</Button>
            </Toolbar>
        </AppBar>
    </div>
    </>
  )
}

export default NavBar
