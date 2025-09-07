
import React from 'react';

const Spinner: React.FC<{}> = () => {
  return (
    <div className="w-12 h-12 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
  );
};

export default Spinner;
