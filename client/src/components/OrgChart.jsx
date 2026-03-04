import React from 'react';
import Tree from 'react-d3-tree';
import { Box, Card, Typography, Stack, Avatar } from '@mui/material';

const OrgChart = () => {
  const containerStyles = {
    width: '100%',
    height: '400px',
    background: '#f9f9f7',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
  };

  const orgData = {
    name: 'Garret Schafer',
    attributes: {
      role: 'Agency Owner',
      totalPremium: '$158,000',
    },
    children: [
      {
        name: 'Sarah J.',
        attributes: {
          level: 115,
          premium: '$45,000',
          policies: '12',
        },
      },
      {
        name: 'Mike R.',
        attributes: {
          level: 115,
          premium: '$38,000',
          policies: '10',
        },
        children: [
          {
            name: 'Jordan K.',
            attributes: {
              level: 105,
              premium: '$28,000',
              policies: '7',
            },
          },
          {
            name: 'Linda W.',
            attributes: {
              level: 105,
              premium: '$15,000',
              policies: '4',
            },
          },
        ],
      },
      {
        name: 'Alex T.',
        attributes: {
          level: 105,
          premium: '$32,000',
          policies: '8',
        },
      },
    ],
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant='h6' sx={{ mb: 2, fontWeight: 700 }}>
        Team Hierarchy
      </Typography>
      <div style={containerStyles}>
        <Tree
          data={orgData}
          orientation='vertical'
          pathFunc='step' // Clean, squared-off lines
          translate={{ x: 300, y: 50 }}
          nodeSize={{ x: 200, y: 200 }}
          renderCustomNodeElement={(rd3tProps) => (
            <g>
              <foreignObject width='160' height='120' x='-80' y='-40'>
                <Stack alignItems='center' spacing={1}>
                  {/* 1. The Circle as a MUI Avatar */}
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: '#2c3e50',
                      border: '2px solid white',
                      boxShadow: 2,
                      fontSize: '0.75rem',
                      fontWeight: 800,
                    }}
                  >
                    {rd3tProps.nodeDatum.attributes?.level || ''}
                  </Avatar>

                  {/* 2. The Info Card */}
                  <Card
                    variant='outlined'
                    sx={{
                      width: '100%',
                      p: 1,
                      textAlign: 'center',
                      boxShadow: 1,
                      borderRadius: 2,
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Typography
                      variant='caption'
                      sx={{ fontWeight: 800, display: 'block', lineHeight: 1.2 }}
                    >
                      {rd3tProps.nodeDatum.name}
                    </Typography>
                    <Typography variant='caption' color='success.main' sx={{ fontWeight: 700 }}>
                      {rd3tProps.nodeDatum.attributes?.premium}
                    </Typography>
                  </Card>
                </Stack>
              </foreignObject>
            </g>
          )}
        />
      </div>
    </Box>
  );
};

export default OrgChart;
