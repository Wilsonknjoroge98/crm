import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getAgent } from '../utils/query.js';

const useAgent = () => {
  const { id } = useSelector((state) => state?.user?.user) || {};
  const { data: agent } = useQuery({
    queryKey: ['agent', id],
    enabled: !!id,
    queryFn: () => getAgent({ data: { id } }),
  });
  if (!agent) return agent;
  return {
    ...agent,
    name: [agent.first_name, agent.last_name].filter(Boolean).join(' '),
  };
};
export { useAgent };
