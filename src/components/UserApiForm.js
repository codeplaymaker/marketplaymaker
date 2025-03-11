import React, { useState } from 'react';
import TradeInfo from './TradeInfo';

const UserApiForm = () => {
  const [apiToken, setApiToken] = useState('');
  const [accountId, setAccountId] = useState('');
  const [userDetails, setUserDetails] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setUserDetails({ apiToken, accountId });
  };

  return (
    <div>
      {!userDetails ? (
        <form onSubmit={handleSubmit}>
          <label>
            API Token:
            <input type="text" value={apiToken} onChange={(e) => setApiToken(e.target.value)} required />
          </label>
          <label>
            Account ID:
            <input type="text" value={accountId} onChange={(e) => setAccountId(e.target.value)} required />
          </label>
          <button type="submit">Submit</button>
        </form>
      ) : (
        <TradeInfo userDetails={userDetails} />
      )}
    </div>
  );
};

export default UserApiForm;
