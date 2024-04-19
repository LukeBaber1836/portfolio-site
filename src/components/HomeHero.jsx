import * as React from 'react';
import Button from "@mui/material/Button";
import { Typography, AppBar, Toolbar, Container, Paper, Grid} from '@mui/material';
import { styled } from '@mui/material/styles';

const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));  

function Homehero() {

  return (
    <>
    <Container maxWidth="md">
        <Grid container spacing={2}>
            <Grid item xs={8}>
                <Item>
                    
                </Item>
            </Grid>
            <Grid item xs={4}>
                <Item>
                    <h1>Hi, I'm Luke!</h1>
                </Item>
            </Grid>
        </Grid>
    </Container>
    </>
  )
}
export default Homehero
