import { useAuth } from '../../../lib/hooks/useAuth';
import { useMyAcks, useAcknowledge, useAckRates } from '../hooks';
import { Button } from '../../../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';

export function AcknowledgementsPage() {
  const { role, profile } = useAuth();
  const isAdminOrManager = role === 'admin' || role === 'manager';
  
  const { data: myAcks, isLoading: myLoading } = useMyAcks(profile?.id || '');
  const ackMutation = useAcknowledge();
  const { data: rates, isLoading: ratesLoading } = useAckRates();

  const handleAck = (policyId: string) => {
    if (profile?.id) {
      ackMutation.mutate({ policyId, userId: profile.id });
    }
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">Policy Acknowledgements</h1>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">My Pending Acknowledgements</h2>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Policy Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>
              ) : myAcks?.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">You have no pending policies to acknowledge.</TableCell></TableRow>
              ) : (
                myAcks?.map((ack: any) => (
                  <TableRow key={ack.id}>
                    <TableCell className="font-medium">{ack.esg_policies?.name}</TableCell>
                    <TableCell>{ack.esg_policies?.version}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => handleAck(ack.policy_id)} disabled={ackMutation.isPending}>
                        Acknowledge
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {isAdminOrManager && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Acknowledgement Rates</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">By Policy</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Policy</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratesLoading ? (
                      <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>
                    ) : rates?.byPolicy?.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No data.</TableCell></TableRow>
                    ) : rates?.byPolicy?.map((p: any) => (
                      <TableRow key={p.name}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell className="text-right">{p.rate.toFixed(1)}% ({p.acked}/{p.total})</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-lg">By Department</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratesLoading ? (
                      <TableRow><TableCell colSpan={2} className="text-center">Loading...</TableCell></TableRow>
                    ) : rates?.byDept?.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No data.</TableCell></TableRow>
                    ) : rates?.byDept?.map((d: any) => (
                      <TableRow key={d.name}>
                        <TableCell>{d.name}</TableCell>
                        <TableCell className="text-right">{d.rate.toFixed(1)}% ({d.acked}/{d.total})</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
