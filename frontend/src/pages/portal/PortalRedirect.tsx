import { useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ExternalLink } from 'lucide-react';

export default function PortalRedirect() {
  const portalUrl = '/portal/';

  useEffect(() => {
    // Auto-open in new tab after a brief delay
    const timer = setTimeout(() => {
      window.open(portalUrl, '_blank');
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="p-6 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="p-8">
          <ExternalLink className="h-12 w-12 mx-auto mb-4 text-blue-500" />
          <h2 className="text-xl font-bold mb-2">Patient Portal</h2>
          <p className="text-muted-foreground mb-6">
            The Patient Portal is a separate application where patients can view their
            appointments, lab results, prescriptions, and manage their health records.
          </p>
          <Button onClick={() => window.open(portalUrl, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Patient Portal
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            A new tab should have opened automatically. If not, click the button above.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
