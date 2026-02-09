use rcgen::generate_simple_self_signed;
use std::fs;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Define the hostnames/IPs this certificate will be valid for
    let subject_alt_names = vec!["localhost".to_string(), "127.0.0.1".to_string()];

    // Generate a self-signed certificate
    let cert = generate_simple_self_signed(subject_alt_names)?;

    // In rcgen 0.13, you access the certificate and key serialization differently
    let cert_pem = cert.cert.pem();
    let key_pem = cert.key_pair.serialize_pem();

    // Save to files in the project root
    fs::create_dir_all("certs")?;
    fs::write("certs/cert.pem", cert_pem)?;
    fs::write("certs/key.pem", key_pem)?;

    println!("Successfully generated cert.pem and key.pem in the certs/ directory.");
    Ok(())
}
