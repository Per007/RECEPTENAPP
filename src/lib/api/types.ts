// Wat de app en de Worker over de lijn sturen.

export const CODE_HEADER = 'X-Receptenboek-Code';

export interface ApiErrorBody {
	error: string;
}

export interface NewBookResponse {
	code: string;
}
