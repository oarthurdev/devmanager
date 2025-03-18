"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { FileText, Upload, X } from "lucide-react";
import Dropzone, { FileWithPath } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface Attachment {
  name: string;
  path: string;
  url: string;
}

interface AttachmentsListProps {
  projectId: string;
  canEdit: boolean;
}

const ProjectAttachments: React.FC<AttachmentsListProps> = ({ projectId, canEdit }) => {
  const supabase = createClient();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showCarousel, setShowCarousel] = useState(false);

  useEffect(() => {
    const fetchAttachments = async () => {
      const { data, error } = await supabase.storage.from("attachments").list(projectId);
      if (error) {
        console.error("Erro ao listar arquivos:", error);
        return;
      }

      const filesWithUrls = await Promise.all(
        data.map(async (file) => {
          const filePath = `${projectId}/${file.name}`;
          const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from("attachments")
            .createSignedUrl(filePath, 3600);

          if (signedUrlError) {
            console.error("Erro ao gerar URL assinada:", signedUrlError);
            return { ...file, url: "" };
          }

          return { name: file.name, path: filePath, url: signedUrlData?.signedUrl };
        })
      );

      setAttachments(filesWithUrls.filter(Boolean) as Attachment[]);
    };

    fetchAttachments();
  }, [projectId, supabase]);

  const cleanUrl = (url: string | undefined) => {
    if (url) {
      return url.replace("/upload", "")
    }
    return url
  }

  const handleUpload = async (files: FileWithPath[]) => {
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const uniqueFileName = `${Date.now()}-${file.name}`;
      const filePath = `${projectId}/${uniqueFileName}`;

      const { data: signedUrlData, error } = await supabase.storage.from("attachments").createSignedUploadUrl(filePath);
      if (error) {
        console.error("Erro ao criar URL assinada:", error);
        return;
      }

      const { error: uploadError } = await supabase.storage
        .from("attachments")
        .uploadToSignedUrl(filePath, signedUrlData.token, file);

      if (uploadError) {
        console.error("Erro ao fazer upload:", uploadError);
        return;
      }

      const cleanSignedUrl = cleanUrl(signedUrlData?.signedUrl)

      setAttachments((prev) => [...prev, { name: uniqueFileName, path: filePath, url: cleanSignedUrl }])
    }

    setUploading(false);
  };

  const deleteFile = async (filePath: string) => {
    await supabase.storage.from("attachments").remove([filePath]);
    setAttachments((prev) => prev.filter((file) => file.path !== filePath));
  };

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">Anexos</h3>

      {canEdit && (
        <Dropzone onDrop={handleUpload} accept={{ "image/*": [".png", ".jpg", ".jpeg"], "application/pdf": [".pdf"] }}>
          {({ getRootProps, getInputProps }) => (
            <div {...getRootProps()} className="border-dashed border-2 p-6 rounded-lg cursor-pointer text-center">
              <input {...getInputProps()} />
              <Upload className="w-6 h-6 mx-auto text-gray-500" />
              <p className="text-gray-600 mt-2">Arraste um arquivo ou clique para selecionar</p>
            </div>
          )}
        </Dropzone>
      )}

      {uploading && <p className="mt-2 text-sm">Enviando...</p>}

      <div className="grid grid-cols-3 gap-4 mt-4">
        {attachments.map((file, index) => (
          <div key={file.name} className="relative group border rounded-md p-2">
            {file.name.endsWith(".pdf") ? (
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> {file.name}
              </a>
            ) : file.name.match(/.(jpg|jpeg|png)$/) ? (
              <img
                src={file.url}
                alt={file.name}
                className="w-full h-32 object-cover rounded cursor-pointer"
                onClick={() => {
                  setCarouselIndex(index);
                  setShowCarousel(true);
                }}
              />
            ) : (
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600">
                <FileText className="w-4 h-4" /> {file.name}
              </a>
            )}
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100"
                onClick={() => deleteFile(file.path)}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {showCarousel && (
        <Dialog open={showCarousel} onOpenChange={setShowCarousel}>
          <DialogContent>
            <img src={attachments[carouselIndex]?.url} alt="Imagem" className="w-full" />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default ProjectAttachments;