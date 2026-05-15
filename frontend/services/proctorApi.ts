/**
 * Proctoring API Service
 *
 * This service abstracts all communication with the proctoring backend.
 * Single source of truth for URLs, error handling, and request/response formatting.
 *
 * If the backend changes (e.g., new endpoint prefix), you only update BASE_URL here.
 * Like the architect's blueprint — change it once, entire building follows.
 */

// Configuration — the living source of truth
const BASE_URL = process.env.REACT_APP_PROCTOR_API_URL || 'http://localhost:8000';

// Request/response types — TypeScript guards against silent failures
export interface MonitorResponse {
    status: 'normal' | 'warning' | 'malpractice';
    action: 'continue' | 'auto_submit';
    reason: string;
    duration?: number;
}

export interface RegisterFaceResponse {
    status: 'success' | 'failed';
    message: string;
    student_id?: string;
}

export interface VerifyFaceResponse {
    status: 'verified' | 'failed';
    message: string;
    student_id?: string;
}

export interface ProctorLog {
    student_id: string;
    status: string;
    reason: string;
    duration: string;
    action: string;
    time: string;
}

export interface LogsResponse {
    status: 'success' | 'failed';
    logs: ProctorLog[];
}

/**
 * Error handler — converts network/API errors into meaningful messages
 * Senior pattern: never let raw errors leak to UI
 */
class ProctorApiError extends Error {
    constructor(
        public code: string,
        public statusCode: number | null,
        message: string
    ) {
        super(message);
        this.name = 'ProctorApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ProctorApiError(
            'API_ERROR',
            response.status,
            errorData.message || `API Error: ${response.statusText}`
        );
    }
    return response.json() as Promise<T>;
}

/**
 * The API contract — all backend communication goes through here
 * This is where frontend and backend are formally "introduced"
 */
export const proctorApi = {
    /**
     * Monitor a student's exam frame for suspicious behavior
     * Analyzes: face presence, face match, head direction, timing
     */
    async monitorFrame(
        studentId: string,
        imageBlob: Blob
    ): Promise<MonitorResponse> {
        const formData = new FormData();
        formData.append('student_id', studentId);
        formData.append('image', imageBlob, 'frame.jpg');

        try {
            const response = await fetch(`${BASE_URL}/monitor`, {
                method: 'POST',
                body: formData,
                // No Content-Type header — browser sets it automatically with FormData
            });

            return handleResponse<MonitorResponse>(response);
        } catch (error) {
            if (error instanceof ProctorApiError) {
                throw error;
            }
            throw new ProctorApiError(
                'NETWORK_ERROR',
                null,
                `Failed to monitor frame: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    },

    /**
     * Register a student's face for later recognition
     * Must be done once per student before exam
     */
    async registerFace(
        studentId: string,
        imageBlob: Blob
    ): Promise<RegisterFaceResponse> {
        const formData = new FormData();
        formData.append('student_id', studentId);
        formData.append('image', imageBlob, 'face.jpg');

        try {
            const response = await fetch(`${BASE_URL}/register-face`, {
                method: 'POST',
                body: formData,
            });

            return handleResponse<RegisterFaceResponse>(response);
        } catch (error) {
            if (error instanceof ProctorApiError) {
                throw error;
            }
            throw new ProctorApiError(
                'NETWORK_ERROR',
                null,
                `Failed to register face: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    },

    /**
     * Verify that the current frame matches the registered student
     * Happens at exam start to confirm identity
     */
    async verifyFace(
        studentId: string,
        imageBlob: Blob
    ): Promise<VerifyFaceResponse> {
        const formData = new FormData();
        formData.append('student_id', studentId);
        formData.append('image', imageBlob, 'verify.jpg');

        try {
            const response = await fetch(`${BASE_URL}/verify-face`, {
                method: 'POST',
                body: formData,
            });

            return handleResponse<VerifyFaceResponse>(response);
        } catch (error) {
            if (error instanceof ProctorApiError) {
                throw error;
            }
            throw new ProctorApiError(
                'NETWORK_ERROR',
                null,
                `Failed to verify face: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    },

    /**
     * Retrieve all proctoring logs (e.g., for exam review)
     */
    async getLogs(): Promise<LogsResponse> {
        try {
            const response = await fetch(`${BASE_URL}/logs`, {
                method: 'GET',
            });

            return handleResponse<LogsResponse>(response);
        } catch (error) {
            if (error instanceof ProctorApiError) {
                throw error;
            }
            throw new ProctorApiError(
                'NETWORK_ERROR',
                null,
                `Failed to fetch logs: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    },

    /**
     * Clear all proctoring logs (admin action)
     */
    async clearLogs(): Promise<{ status: string; message: string }> {
        try {
            const response = await fetch(`${BASE_URL}/logs`, {
                method: 'DELETE',
            });

            return handleResponse<{ status: string; message: string }>(response);
        } catch (error) {
            if (error instanceof ProctorApiError) {
                throw error;
            }
            throw new ProctorApiError(
                'NETWORK_ERROR',
                null,
                `Failed to clear logs: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    },
};

/**
 * Usage in React components:
 *
 * import { proctorApi } from '@/services/proctorApi'
 *
 * try {
 *   const result = await proctorApi.monitorFrame(studentId, imageBlob)
 *   if (result.status === 'warning') {
 *     showNotification(result.reason)
 *   }
 * } catch (error) {
 *   if (error instanceof ProctorApiError) {
 *     console.error(`${error.code}: ${error.message}`)
 *   }
 * }
 */