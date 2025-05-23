import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-jwt-secret';

/**
 * สร้าง JWT token
 * @param {Object} payload ข้อมูลที่ต้องการเก็บใน token
 * @param {string} expiresIn เวลาหมดอายุของ token (default: '1d')
 * @returns {string} JWT token
 */
export function createJwt(payload, expiresIn = '1d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * ตรวจสอบ JWT token
 * @param {string} token JWT token ที่ต้องการตรวจสอบ
 * @returns {Object} ข้อมูลที่ถูกเก็บใน token
 * @throws {Error} หากตรวจสอบไม่ผ่าน
 */
export function verifyJwt(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        console.error('JWT verification failed:', error);
        throw new Error('Invalid token');
    }
}

/**
 * ถอดรหัส JWT token โดยไม่ตรวจสอบความถูกต้อง
 * @param {string} token JWT token ที่ต้องการถอดรหัส
 * @returns {Object|null} ข้อมูลที่ถูกเก็บใน token หรือ null หากไม่สามารถถอดรหัสได้
 */
export function decodeJwt(token) {
    try {
        return jwt.decode(token);
    } catch (error) {
        console.error('JWT decode failed:', error);
        return null;
    }
} 