import { Fetcher, Job } from '@sonarwatch/portfolio-core';
import { jobs as wallettokensJobs } from './plugins/wallettokens';
import {
  jobs as marinadeJobs,
  fetchers as marinadeFetchers,
} from './plugins/marinade';
import {
  jobs as raydiumJobs,
  fetchers as raydiumFetchers,
} from './plugins/raydium';
import {
  jobs as marginfiJobs,
  fetchers as marginfiFetchers,
} from './plugins/marginfi';
import { fetchers as tensorFetchers } from './plugins/tensor';

export const jobs: Job[] = [
  ...marginfiJobs,
  ...marinadeJobs,
  ...raydiumJobs,
  ...wallettokensJobs,
];

export const fetchers: Fetcher[] = [
  ...tensorFetchers,
  ...marginfiFetchers,
  ...marinadeFetchers,
  ...raydiumFetchers,
];
