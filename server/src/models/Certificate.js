import db from '../config/database.js';

class Certificate {
    static create(data) {
        const stmt = db.prepare(`
      INSERT INTO certificates (
        id, recipient_name, certificate_number, award_rera_number,
        description, phone_number, email, pdf_path
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

        const info = stmt.run(
            data.id,
            data.recipient_name,
            data.certificate_number,
            data.award_rera_number || null,
            data.description || null,
            data.phone_number || null,
            data.email || null,
            data.pdf_path || null
        );

        return this.findById(data.id);
    }

    static findById(id) {
        const stmt = db.prepare('SELECT * FROM certificates WHERE id = ?');
        return stmt.get(id);
    }

    static findByCertificateNumber(certificateNumber) {
        const stmt = db.prepare('SELECT * FROM certificates WHERE certificate_number = ?');
        return stmt.get(certificateNumber);
    }

    static findAll(limit = 100, offset = 0) {
        const stmt = db.prepare(`
      SELECT * FROM certificates 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
        return stmt.all(limit, offset);
    }

    static update(id, data) {
        const fields = [];
        const values = [];

        Object.keys(data).forEach(key => {
            if (data[key] !== undefined && key !== 'id') {
                fields.push(`${key} = ?`);
                values.push(data[key]);
            }
        });

        if (fields.length === 0) return this.findById(id);

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const stmt = db.prepare(`
      UPDATE certificates 
      SET ${fields.join(', ')} 
      WHERE id = ?
    `);

        stmt.run(...values);
        return this.findById(id);
    }

    static updateWhatsAppStatus(id, sent = true) {
        const stmt = db.prepare(`
      UPDATE certificates 
      SET whatsapp_sent = ?, whatsapp_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        stmt.run(sent ? 1 : 0, id);
        return this.findById(id);
    }

    static delete(id) {
        const stmt = db.prepare('DELETE FROM certificates WHERE id = ?');
        const info = stmt.run(id);
        return info.changes > 0;
    }

    static count() {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM certificates');
        return stmt.get().count;
    }

    static getStats() {
        const total = this.count();
        const sentStmt = db.prepare('SELECT COUNT(*) as count FROM certificates WHERE whatsapp_sent = 1');
        const sent = sentStmt.get().count;

        return {
            total,
            whatsapp_sent: sent,
            pending: total - sent
        };
    }
}

export default Certificate;
