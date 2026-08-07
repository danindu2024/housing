<?php
try {
    $pdo = new PDO("mysql:host=localhost;dbname=housing;charset=utf8mb4", "root", "", [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
    
    // Update admin user full_name
    $stmt1 = $pdo->prepare("UPDATE inspector SET full_name = 'System Administrator' WHERE email IN ('admin@nhd.lk', 'admin@gov.lk')");
    $stmt1->execute();
    
    // Update all district officer full_names and designations
    $stmt2 = $pdo->prepare("UPDATE inspector SET full_name = REPLACE(full_name, ' District Investigator', ' Officer'), designation = 'District Officer' WHERE full_name LIKE '% District Investigator'");
    $stmt2->execute();

    // Also update any remaining 'NHD System Administrator' or 'System Admin'
    $stmt3 = $pdo->prepare("UPDATE inspector SET full_name = REPLACE(full_name, 'NHD System Administrator', 'System Administrator')");
    $stmt3->execute();
    
    $inspectors = $pdo->query("SELECT id, full_name, email, designation FROM inspector")->fetchAll();
    echo "Successfully updated user display names for " . count($inspectors) . " inspectors:\n";
    foreach ($inspectors as $inspector) {
        echo "- {$inspector['email']} => {$inspector['full_name']} ({$inspector['designation']})\n";
    }
} catch (\Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
