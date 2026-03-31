import React, { useRef, useState, useEffect } from 'react';
import Tree from 'react-d3-tree';
import { Box, Card, Typography, Stack, Avatar, Skeleton } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { getHierarchy } from '../utils/query';

const OrgChart = ({ startDate, endDate }) => {
  const containerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 300, y: 50 });

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['hierarchy', startDate, endDate],
    queryFn: () => getHierarchy({ startDate, endDate }),
  });

  useEffect(() => {
    if (containerRef.current) {
      const { width } = containerRef.current.getBoundingClientRect();
      setTranslate({ x: width / 2, y: 50 });
    }
  }, [orgData]);

  return (
    <Box sx={{ mt: 4, width: '100%', height: '100%' }}>
      {isLoading ? (
        <Skeleton variant='rounded' height={400} />
      ) : (
        <div
          ref={containerRef}
          style={{
            width: '100%',
            height: '400px',
            background: '#f9f9f7',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
          }}
        >
          {orgData && (
            <Tree
              data={orgData}
              orientation='vertical'
              pathFunc='step'
              translate={translate}
              nodeSize={{ x: 200, y: 200 }}
              renderCustomNodeElement={(rd3tProps) => (
                <g>
                  <foreignObject width='160' height='120' x='-80' y='-40'>
                    <Stack alignItems='center' spacing={1}>
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
                          sx={{
                            fontWeight: 800,
                            display: 'block',
                            lineHeight: 1.2,
                          }}
                        >
                          {rd3tProps.nodeDatum.name}
                        </Typography>
                        <Typography
                          variant='caption'
                          color='success.main'
                          sx={{ fontWeight: 700 }}
                        >
                          {rd3tProps.nodeDatum.attributes?.premium}
                        </Typography>
                      </Card>
                    </Stack>
                  </foreignObject>
                </g>
              )}
            />
          )}
        </div>
      )}
    </Box>
  );
};

export default OrgChart;
