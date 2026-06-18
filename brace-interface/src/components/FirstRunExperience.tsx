import React, { useState } from 'react';

export const FirstRunExperience: React.FC = () => {
  const [step, setStep] = useState(1);
  const [completed, setCompleted] = useState(false);

  if (completed) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
      <div style={{ background: '#111', padding: '40px', borderRadius: '12px', width: '500px', border: '1px solid #333', textAlign: 'center' }}>
        <h1 style={{ color: '#00e5ff', marginBottom: '20px' }}>Welcome to Brace OS</h1>
        
        {step === 1 && (
          <div>
            <h3>Step 1: Operating Mode</h3>
            <p style={{ color: '#888' }}>Choose how you want your data to be processed.</p>
            <button onClick={() => setStep(2)} style={{ margin: '10px', padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Local Only</button>
            <button onClick={() => setStep(2)} style={{ margin: '10px', padding: '10px 20px', background: '#00e5ff', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cloud Hybrid</button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3>Step 2: Workspace Setup</h3>
            <p style={{ color: '#888' }}>Select your primary domain pack.</p>
            <button onClick={() => setStep(3)} style={{ margin: '10px', padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Development Studio</button>
            <button onClick={() => setStep(3)} style={{ margin: '10px', padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Research Studio</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3>Step 3: Ready for Launch</h3>
            <p style={{ color: '#888' }}>Your OS is configured and ready.</p>
            <button onClick={() => setCompleted(true)} style={{ margin: '10px', padding: '10px 20px', background: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Enter Brace OS</button>
          </div>
        )}
      </div>
    </div>
  );
};
