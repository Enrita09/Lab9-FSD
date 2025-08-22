const express = require('express');
const nodemailer = require('nodemailer');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const fs = require('fs');
const connection = require('./db');
const cors = require('cors')
const app = express();
app.use(express.json());
app.use(cors())
app.use(express.static(__dirname));

app.get('/patients', (req, res) => {
  connection.query('SELECT * FROM patients', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ patients: results });
  });
});


//Insert
app.post('/patients', upload.single('document'), async (req, res) => {
  const { patient_id, name, age, address, email, admission_datetime, file_name } = req.body;

  if (!patient_id || !name || !age || !address || !email || !admission_datetime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let img = null;
  if (req.file) {
    img = fs.readFileSync(req.file.path);
    fs.unlinkSync(req.file.path); 
  }

  connection.query(
    `INSERT INTO patients 
     (patient_id, name, age, address,email, admission_datetime, file_name, document) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [patient_id, name, age, address, email, admission_datetime, file_name || null, img],
    async (err, results) => {
      if (err) {
        console.error('Database Error:', err);
        return res.status(500).json({ error: 'Database error' });
      }


      try {
        // Configure transporter
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,  // your Gmail
            pass: process.env.EMAIL_PASS   // your app password
          }
        });

        // HTML Email Template
        const htmlContent = `
    <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; max-width: 600px; margin: auto;">


  <h2 style="color: #16a34a;">Patient Admission Confirmation</h2>
  <p>Dear ${name},</p>
  <p>Your admission has been successfully completed. Please find your details below:</p>

  <!-- Patient Details Table -->
  <table style="border-collapse: collapse; width: 100%; margin-top: 10px;">
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc;"><strong>Patient ID:</strong></td>
      <td style="padding: 6px; border: 1px solid #ccc;">${patient_id}</td>
    </tr>
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc;"><strong>Name:</strong></td>
      <td style="padding: 6px; border: 1px solid #ccc;">${name}</td>
    </tr>
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc;"><strong>Age:</strong></td>
      <td style="padding: 6px; border: 1px solid #ccc;">${age}</td>
    </tr>
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc;"><strong>Address:</strong></td>
      <td style="padding: 6px; border: 1px solid #ccc;">${address}</td>
    </tr>
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc;"><strong>Address:</strong></td>
      <td style="padding: 6px; border: 1px solid #ccc;">${email}</td>
    </tr>
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc;"><strong>Admission Date & Time:</strong></td>
      <td style="padding: 6px; border: 1px solid #ccc;">${admission_datetime}</td>
    </tr>
  </table>

  <p style="margin-top: 15px;">We wish you a speedy recovery and the best of care during your stay.</p>

  <div style="margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #555; font-size: 14px; text-align: center;">
    <p><strong>Be-Lieve Hospitals</strong></p>
    <p>123 Main Street, Your City</p>
    <p>Email: support@cityhospital.com | Phone: +91-9876543210</p>
    <p style="margin-top: 10px; font-size: 12px; color: #888;">This is an automated confirmation email. Please do not reply directly.</p>
  </div>
</div>
`;

        await transporter.sendMail({
          from: `"Be-Lieve Hospitals" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `Admission Confirmation `,
          html: htmlContent
        });

        res.status(201).json({
          message: 'Patient admitted successfully and email sent',
          id: results.insertId
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Patient admitted, but email failed to send' });
      }

    });
});

// Update
app.put('/patients/:id', upload.single('document'), (req, res) => {
  const id = req.params.id;
  const { name, age, address, admission_datetime, email, file_name } = req.body;

  if (!name || !age || !address || !email || !admission_datetime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let img = null;
  if (req.file) {
    img = fs.readFileSync(req.file.path);
    fs.unlinkSync(req.file.path); // delete temp upload
  }

  
  let query = `
    UPDATE patients 
    SET name = ?, age = ?, address = ?, email = ?, admission_datetime = ?, file_name = ?
  `;
  let params = [name, age, address, email, admission_datetime || null, file_name || null];

  if (img) {
    query += `, document = ?`;
    params.push(img);
  }

  query += ` WHERE patient_id = ?`;
  params.push(id);

  connection.query(query, params, (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ message: 'Patient updated successfully' });
  });
});


app.get('/patients/:id/document', (req, res) => {
  const id = req.params.id;
  connection.query(
    'SELECT document, file_name FROM patients WHERE patient_id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (results.length === 0 || !results[0].document) {
        return res.status(404).json({ error: 'No file found' });
      }

   
      const fileName = results[0].file_name || 'file.bin';
      const mime = fileName.endsWith('.png') ? 'image/png'
                  : fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg'
                  : 'application/octet-stream';

      res.setHeader('Content-Type', mime);
      res.send(results[0].document);
    }
  );
});



app.delete('/patients/:id', (req, res) => {
  const id = req.params.id;

  connection.query(
    'DELETE FROM patients WHERE patient_id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Patient not found' });
      }
      res.json({ message: 'Patient deleted successfully' });
    }
  );
});



app.listen(3000, () => console.log('Server running on http://localhost:3000'));  
