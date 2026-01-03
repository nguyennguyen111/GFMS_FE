<!-- // Khai báo thêm state cho input (trong component UserList)
const [email, setEmail] = useState("");
const [username, setUsername] = useState("");
const [password, setPassword] = useState(""); // Nếu có trường password

const handleCreateUser = async () => {
    try {
        const payload = { email, username, password };
        // Gọi API POST tới route /user/create
        await axios.post("http://localhost:8080/user/create", payload);
        
        alert("Tạo người dùng thành công!");
        
        // Xóa trắng input sau khi tạo
        setEmail("");
        setUsername("");
        setPassword("");

        // Cập nhật lại danh sách trên giao diện
        await fetchUsers(); 
    } catch (error) {
        console.error(error);
        alert("Tạo thất bại: " + (error.response?.data?.error || "Lỗi server"));
    }
};
----
<!-- import React, { useEffect, useState } from 'react';
import axios from 'axios';

const UserList = () => {
    const [listUsers, setListUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    // 1. Hàm gọi API lấy danh sách người dùng
    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get("http://localhost:8080/user/read");
            
            // Vì API trả về mảng trực tiếp, ta dùng res.data luôn
            setListUsers(res.data); 
        } catch (error) {
            console.error("Lỗi API:", error);
            alert("Không thể lấy danh sách người dùng!");
        } finally {
            setLoading(false);
        }
    };

    // 2. Chạy hàm lấy dữ liệu khi component vừa load
    useEffect(() => {
        fetchUsers();
    }, []);

    if (loading) return <div>Đang tải dữ liệu...</div>;

    return (
        <div className="container mt-4">
            <h2>Danh sách người dùng</h2>
            <table className="table table-bordered">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Username</th>
                        <th>Hành động</th>
                    </tr>
                </thead>
                <tbody>
                    {listUsers && listUsers.length > 0 ? (
                        listUsers.map((user, index) => (
                            <tr key={`user-${index}`}>
                                <td>{user.id}</td>
                                <td>{user.email}</td>
                                <td>{user.username}</td>
                                <td>
                                    <button className="btn btn-warning me-2">Sửa</button>
                                    <button className="btn btn-danger">Xóa</button>
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" className="text-center">Không có dữ liệu</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default UserList; -->
---
<!-- const [isEditing, setIsEditing] = useState(false);
const [currentId, setCurrentId] = useState(null);

// Bước 1: Khi nhấn nút "Sửa" trên dòng của bảng
const handleEditClick = (user) => {
    setIsEditing(true);
    setCurrentId(user.id);
    setEmail(user.email);
    setUsername(user.username);
};

// Bước 2: Khi nhấn nút "Xác nhận cập nhật"
const handleUpdateUser = async () => {
    try {
        const payload = { email, username };
        // Gọi API PUT tới route /user/update/:id
        await axios.put(`http://localhost:8080/user/update/${currentId}`, payload);
        
        alert("Cập nhật thành công!");
        setIsEditing(false);
        setCurrentId(null);
        
        // Load lại bảng
        await fetchUsers(); 
    } catch (error) {
        alert("Cập nhật thất bại!");
    }
}; -->
--
<!-- const handleDeleteUser = async (userId) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa?")) {
        try {
            // Gọi API xóa theo chuẩn RESTful (truyền ID lên URL)
            await axios.delete(`http://localhost:8080/user/delete/${userId}`);
            alert("Xóa thành công!");
            
            // Bước quan trọng: Gọi lại hàm fetch để giao diện tự cập nhật
            await fetchUsers(); 
        } catch (error) {
            alert("Xóa thất bại!");
        }
    }
}; -->
-- -->
