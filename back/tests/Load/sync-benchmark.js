import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 200 },
    { duration: '30s', target: 500 },
    { duration: '1m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
    merge_duration: ['p(95)<2000', 'p(99)<5000'],
    pull_duration: ['p(95)<500'],
  },
};

const mergeTrend = new Trend('merge_duration');
const pullTrend = new Trend('pull_duration');
const errorRate = new Rate('sync_errors');

const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:8000/api';

function getAuthToken() {
  const payload = JSON.stringify({
    email: __ENV.TEST_EMAIL || `loadtest-${__VU}@test.local`,
    password: __ENV.TEST_PASSWORD || 'password',
  });

  const res = http.post(`${BASE_URL}/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (res.status === 200) {
    const token = res.json('token');
    if (token) return token;
  }

  const registerRes = http.post(`${BASE_URL}/register`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (registerRes.status === 200) {
    return registerRes.json('token');
  }

  return null;
}

export default function () {
  const token = getAuthToken();
  if (!token) {
    errorRate.add(1);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Sync-Protocol-Version': '2',
  };

  const pullStart = Date.now();
  const pullRes = http.get(`${BASE_URL}/sync/changes?last_sync=1970-01-01T00:00:00Z&limit=200`, {
    headers: authHeaders,
  });
  pullTrend.add(Date.now() - pullStart);

  check(pullRes, {
    'pull status is 200': (r) => r.status === 200,
  });

  if (pullRes.status !== 200) {
    errorRate.add(1);
  }

  const accountData = {
    sync_id: `loadtest-${__VU}-${__ITER}`,
    name: `Load Test Account ${__VU}-${__ITER}`,
    type: 'checking',
    currency: 'USD',
    status: 'active',
  };

  const mergeStart = Date.now();
  const mergeRes = http.post(
    `${BASE_URL}/sync/merge`,
    JSON.stringify({ data: { account: [accountData] } }),
    { headers: authHeaders },
  );
  mergeTrend.add(Date.now() - mergeStart);

  check(mergeRes, {
    'merge status is 200': (r) => r.status === 200,
    'merge success': (r) => r.json('success') === true,
  });

  if (mergeRes.status !== 200) {
    errorRate.add(1);
  }

  sleep(1);
}
