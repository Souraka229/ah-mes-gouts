import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 500 },
    { duration: "5m", target: 1000 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

const BASE = __ENV.BASE_URL ?? "https://gift-entremets.vercel.app";

export default function () {
  const paths = ["/", "/catalogue"];
  const path = paths[Math.floor(Math.random() * paths.length)]!;
  const res = http.get(`${BASE}${path}`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(Math.random() * 3 + 1);
}
