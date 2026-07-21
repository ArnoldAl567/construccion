import { environment } from '../../../environments/environment.generated';

export const API_URL = environment.apiUrl.replace(/\/+$/, '');
