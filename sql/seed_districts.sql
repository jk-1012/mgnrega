-- Seed some sample districts (add more as needed)
-- Data from MGNREGA official sources

INSERT INTO districts (state, district_code, district_name_en, district_name_hi) VALUES
-- Uttar Pradesh
('Uttar Pradesh', '0901', 'Agra', 'आगरा'),
('Uttar Pradesh', '0902', 'Aligarh', 'अलीगढ़'),
('Uttar Pradesh', '0903', 'Allahabad', 'इलाहाबाद'),
('Uttar Pradesh', '0904', 'Ambedkar Nagar', 'अम्बेडकर नगर'),
('Uttar Pradesh', '0905', 'Amethi', 'अमेठी'),
('Uttar Pradesh', '0906', 'Amroha', 'अमरोहा'),
('Uttar Pradesh', '0907', 'Auraiya', 'औरैया'),
('Uttar Pradesh', '0908', 'Azamgarh', 'आजमगढ़'),
('Uttar Pradesh', '0909', 'Baghpat', 'बागपत'),
('Uttar Pradesh', '0910', 'Bahraich', 'बहराइच'),
('Uttar Pradesh', '0911', 'Ballia', 'बलिया'),
('Uttar Pradesh', '0912', 'Balrampur', 'बलरामपुर'),
('Uttar Pradesh', '0913', 'Banda', 'बांदा'),
('Uttar Pradesh', '0914', 'Barabanki', 'बाराबंकी'),
('Uttar Pradesh', '0915', 'Bareilly', 'बरेली'),
('Uttar Pradesh', '0916', 'Basti', 'बस्ती'),
('Uttar Pradesh', '0917', 'Bijnor', 'बिजनौर'),
('Uttar Pradesh', '0918', 'Budaun', 'बदायूं'),
('Uttar Pradesh', '0919', 'Bulandshahr', 'बुलंदशहर'),
('Uttar Pradesh', '0920', 'Chandauli', 'चंदौली'),

-- Bihar
('Bihar', '1001', 'Araria', 'अररिया'),
('Bihar', '1002', 'Arwal', 'अरवल'),
('Bihar', '1003', 'Aurangabad', 'औरंगाबाद'),
('Bihar', '1004', 'Banka', 'बांका'),
('Bihar', '1005', 'Begusarai', 'बेगूसराय'),
('Bihar', '1006', 'Bhagalpur', 'भागलपुर'),
('Bihar', '1007', 'Bhojpur', 'भोजपुर'),
('Bihar', '1008', 'Buxar', 'बक्सर'),
('Bihar', '1009', 'Darbhanga', 'दरभंगा'),
('Bihar', '1010', 'East Champaran', 'पूर्वी चंपारण'),

-- Madhya Pradesh
('Madhya Pradesh', '2301', 'Agar Malwa', 'आगर मालवा'),
('Madhya Pradesh', '2302', 'Alirajpur', 'अलीराजपुर'),
('Madhya Pradesh', '2303', 'Anuppur', 'अनूपपुर'),
('Madhya Pradesh', '2304', 'Ashoknagar', 'अशोकनगर'),
('Madhya Pradesh', '2305', 'Balaghat', 'बालाघाट'),
('Madhya Pradesh', '2306', 'Barwani', 'बड़वानी'),
('Madhya Pradesh', '2307', 'Betul', 'बैतूल'),
('Madhya Pradesh', '2308', 'Bhind', 'भिंड'),
('Madhya Pradesh', '2309', 'Bhopal', 'भोपाल'),
('Madhya Pradesh', '2310', 'Burhanpur', 'बुरहानपुर'),

-- Rajasthan
('Rajasthan', '0801', 'Ajmer', 'अजमेर'),
('Rajasthan', '0802', 'Alwar', 'अलवर'),
('Rajasthan', '0803', 'Banswara', 'बांसवाड़ा'),
('Rajasthan', '0804', 'Baran', 'बारां'),
('Rajasthan', '0805', 'Barmer', 'बाड़मेर'),
('Rajasthan', '0806', 'Bharatpur', 'भरतपुर'),
('Rajasthan', '0807', 'Bhilwara', 'भीलवाड़ा'),
('Rajasthan', '0808', 'Bikaner', 'बीकानेर'),
('Rajasthan', '0809', 'Bundi', 'बूंदी'),
('Rajasthan', '0810', 'Chittorgarh', 'चित्तौड़गढ़'),

-- Gujarat
('Gujarat', '2401', 'Ahmedabad', 'अहमदाबाद'),
('Gujarat', '2402', 'Amreli', 'अमरेली'),
('Gujarat', '2403', 'Anand', 'आनंद'),
('Gujarat', '2404', 'Aravalli', 'अरावली'),
('Gujarat', '2405', 'Banaskantha', 'बनासकांठा'),
('Gujarat', '2406', 'Bharuch', 'भरूच'),
('Gujarat', '2407', 'Bhavnagar', 'भावनगर'),
('Gujarat', '2408', 'Botad', 'बोटाद'),
('Gujarat', '2409', 'Chhota Udaipur', 'छोटा उदयपुर'),
('Gujarat', '2410', 'Dahod', 'दाहोद')

ON CONFLICT (district_code) DO NOTHING;

-- Note: Add all 700+ districts from official MGNREGA district codes
-- This is a sample. Full list available at: https://nrega.nic.in/