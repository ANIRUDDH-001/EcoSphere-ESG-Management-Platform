import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { environmentalApi } from './api';
import { envKeys } from './keys';
import type { EmissionFactorFormValues } from './schemas';

export const useFactors = (status?: string) => {
  return useQuery({
    queryKey: [...envKeys.factors, { status }],
    queryFn: () => environmentalApi.listFactors(status)
  });
};

export const useCreateFactor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EmissionFactorFormValues) => environmentalApi.createFactor(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: envKeys.factors });
    }
  });
};

export const useUpdateFactor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<EmissionFactorFormValues> }) => 
      environmentalApi.updateFactor(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: envKeys.factors });
    }
  });
};

export const useArchiveFactor = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => environmentalApi.archiveFactor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: envKeys.factors });
    }
  });
};
