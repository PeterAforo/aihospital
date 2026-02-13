import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function Step7Welcome() {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate('/login');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          backgroundColor: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
        }}
      >
        <CheckCircle style={{ width: '60px', height: '60px', color: '#16a34a' }} />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ fontSize: '2rem', fontWeight: 700, color: '#1f2937', marginBottom: '1rem' }}
      >
        🎉 Welcome to MediCare Ghana!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ color: '#6b7280', fontSize: '1.125rem', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}
      >
        Your hospital account has been created successfully. You can now log in and start managing your healthcare operations.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        style={{
          backgroundColor: '#f0fdf4',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem',
        }}
      >
        <h3 style={{ fontWeight: 600, color: '#166534', marginBottom: '0.75rem' }}>What's Next?</h3>
        <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', maxWidth: '300px', marginLeft: 'auto', marginRight: 'auto' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            <CheckCircle style={{ width: '16px', height: '16px' }} /> Log in to your dashboard
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            <CheckCircle style={{ width: '16px', height: '16px' }} /> Add your first patient
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
            <CheckCircle style={{ width: '16px', height: '16px' }} /> Schedule appointments
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534', fontSize: '0.875rem' }}>
            <CheckCircle style={{ width: '16px', height: '16px' }} /> Explore all features
          </li>
        </ul>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate('/login')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '14px 32px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Go to Login <ArrowRight style={{ width: '20px', height: '20px' }} />
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        style={{ marginTop: '1.5rem', color: '#9ca3af', fontSize: '0.875rem' }}
      >
        Redirecting to login in 5 seconds...
      </motion.p>
    </div>
  );
}
