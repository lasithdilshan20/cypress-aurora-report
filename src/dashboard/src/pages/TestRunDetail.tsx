import React from 'react';
import { useParams } from 'react-router-dom';

export const TestRunDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Test Run Details</h1>
      <p>Test Run ID: {id}</p>
      <p>This page will show detailed information about the specific test run.</p>
    </div>
  );
};